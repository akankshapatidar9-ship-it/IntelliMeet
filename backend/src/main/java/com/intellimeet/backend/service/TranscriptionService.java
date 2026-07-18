package com.intellimeet.backend.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import okhttp3.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.TimeUnit;


@Service
public class TranscriptionService {

    @Value("${assemblyai.api.key}")
    private String API_KEY;
    private static final String UPLOAD_URL = "https://api.assemblyai.com/v2/upload";
    private static final String TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript";

    private final OkHttpClient client;
    public final Gson gson; // Made public for testing

    public TranscriptionService() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build();
        this.gson = new Gson();
    }

    public String transcribeAudio(String filePath) throws IOException, InterruptedException {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new IOException("File not found: " + filePath);
        }

        // --- PHASE 1: UPLOAD VIDEO ---
        System.out.println("🚀 1. Uploading file to AI...");
        RequestBody fileBody = RequestBody.create(file, MediaType.parse("application/octet-stream"));
        Request uploadRequest = new Request.Builder()
                .url(UPLOAD_URL)
                .addHeader("authorization", API_KEY)
                .post(fileBody)
                .build();

        String uploadUrl;
        try (Response response = client.newCall(uploadRequest).execute()) {
            if (!response.isSuccessful()) {
                String err = response.body().string();
                System.err.println("❌ Upload Failed: " + err);
                throw new IOException("Upload failed: " + err);
            }
            JsonObject json = gson.fromJson(response.body().string(), JsonObject.class);
            uploadUrl = json.get("upload_url").getAsString();
            System.out.println("   -> Uploaded to: " + uploadUrl);
        }

        // --- PHASE 2: REQUEST TRANSCRIPT ---
        System.out.println("🧠 2. Requesting transcription...");
        JsonObject requestJson = new JsonObject();
        requestJson.addProperty("audio_url", uploadUrl);
        requestJson.addProperty("speaker_labels", true);

        // Create a list (Array) because the new API demands it
        JsonArray speechModels = new JsonArray();
        speechModels.add("universal-2");
        speechModels.add("universal-3-pro");

        // Add the list to the request using .add() instead of .addProperty()
        requestJson.add("speech_models", speechModels);

        RequestBody requestBody = RequestBody.create(gson.toJson(requestJson), MediaType.parse("application/json"));
        Request transcriptRequest = new Request.Builder()
                .url(TRANSCRIPT_URL)
                .addHeader("authorization", API_KEY)
                .post(requestBody)
                .build();

        String transcriptId;
        try (Response response = client.newCall(transcriptRequest).execute()) {
            if (!response.isSuccessful()) {
                assert response.body() != null;
                String errorBody = response.body().string();
                System.err.println("❌ Transcription Request Failed. Status: " + response.code());
                System.err.println("❌ Error Body: " + errorBody);
                throw new IOException("Transcription request failed: " + errorBody);
            }
            assert response.body() != null;
            JsonObject json = gson.fromJson(response.body().string(), JsonObject.class);
            transcriptId = json.get("id").getAsString();
        }

        // --- PHASE 3: POLLING ---
        System.out.println("⏳ 3. Waiting for AI processing (ID: " + transcriptId + ")...");
        while (true) {
            Request pollingRequest = new Request.Builder()
                    .url(TRANSCRIPT_URL + "/" + transcriptId)
                    .addHeader("authorization", API_KEY)
                    .get()
                    .build();

            try (Response response = client.newCall(pollingRequest).execute()) {
                if (!response.isSuccessful()) { 
                    System.err.println("❌ Polling failed: " + response.body().string());
                    throw new IOException("Polling failed");
                }
                JsonObject json = gson.fromJson(response.body().string(), JsonObject.class);
                String status = json.get("status").getAsString();

                if ("completed".equals(status)) {
                    System.out.println("✅ AI Finished!");

                    // --- NEW: EXTRACT SPEAKER DIARIZATION (UTTERANCES) ---
                    StringBuilder formattedTranscript = new StringBuilder();

                    if (json.has("utterances") && !json.get("utterances").isJsonNull()) {
                        JsonArray utterances = json.getAsJsonArray("utterances");
                        for (int i = 0; i < utterances.size(); i++) {
                            JsonObject utterance = utterances.get(i).getAsJsonObject();
                            String speaker = utterance.get("speaker").getAsString();
                            String spokenText = utterance.get("text").getAsString();

                            // Format: "Speaker A: Hello world!"
                            formattedTranscript.append("Speaker ").append(speaker).append(":\n");
                            formattedTranscript.append(spokenText).append("\n\n");
                        }
                    } else {
                        // Fallback just in case
                        formattedTranscript.append(json.get("text").getAsString());
                    }

                    String text = formattedTranscript.toString().trim();
                    return text;
                } else if ("error".equals(status)) {
                    String errorDetail = json.get("error").getAsString();
                    throw new IOException("Transcription failed: " + errorDetail);
                }
            }
            Thread.sleep(3000);
        }
    }
}