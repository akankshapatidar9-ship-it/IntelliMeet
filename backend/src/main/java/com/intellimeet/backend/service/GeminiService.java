package com.intellimeet.backend.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final OkHttpClient client;
    private final Gson gson;

    public GeminiService() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build();
        this.gson = new Gson();
    }

    public Map<String, String> generateTitleAndSummary(String transcript) throws IOException {
        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=" + geminiApiKey;
        System.out.println("✨ Sending transcript to Gemini for analysis...");

        // 1. The Prompt
        String prompt = "You are an expert meeting assistant. Read the following transcript and provide:\n" +
                "1. A short, professional title for the meeting (max 6 words).\n" +
                "2. A concise, bulleted summary of the key points and action items.\n\n" +
                "Transcript:\n" + transcript;

        JsonObject textPart = new JsonObject();
        textPart.addProperty("text", prompt);

        JsonArray partsArray = new JsonArray();
        partsArray.add(textPart);

        JsonObject contentObj = new JsonObject();
        contentObj.add("parts", partsArray);

        JsonArray contentsArray = new JsonArray();
        contentsArray.add(contentObj);

        JsonObject generationConfig = new JsonObject();
        generationConfig.addProperty("response_mime_type", "application/json");

        JsonObject requestBodyJson = new JsonObject();
        requestBodyJson.add("contents", contentsArray);
        requestBodyJson.add("generationConfig", generationConfig);

        RequestBody body = RequestBody.create(gson.toJson(requestBodyJson), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(geminiUrl)
                .post(body)
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Gemini API failed: " + response.body().string());
            }

            // 2. Extract the raw string from Gemini's response
            JsonObject jsonResponse = gson.fromJson(response.body().string(), JsonObject.class);
            String aiTextOutput = jsonResponse.getAsJsonArray("candidates")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts")
                    .get(0).getAsJsonObject()
                    .get("text").getAsString();

            // --- THE ULTIMATE DEBUGGER & CLEANER ---
            System.out.println("RAW GEMINI OUTPUT:\n" + aiTextOutput);

            // Find where the actual JSON object starts and ends
            int startIndex = aiTextOutput.indexOf('{');
            int endIndex = aiTextOutput.lastIndexOf('}');

            if (startIndex != -1 && endIndex != -1 && startIndex <= endIndex) {
                // Snip out ONLY the valid JSON part
                aiTextOutput = aiTextOutput.substring(startIndex, endIndex + 1);
            } else {
                throw new IOException("Gemini did not return a valid JSON object. Raw output: " + aiTextOutput);
            }

            // 3. Parse Gemini's JSON text safely
            JsonObject parsedResult = gson.fromJson(aiTextOutput, JsonObject.class);
            Map<String, String> result = new HashMap<>();

            // --- SAFELY EXTRACT TITLE ---
            String title = "Meeting Update";
            if (parsedResult.has("title")) {
                title = parsedResult.get("title").getAsString();
            } else if (parsedResult.has("meeting_title")) {
                title = parsedResult.get("meeting_title").getAsString(); // Catches new naming habit
            }
            result.put("title", title);

            // --- SAFELY EXTRACT SUMMARY (Handles Strings, Arrays, AND Nested Objects) ---
            String finalSummary = "Summary unavailable.";

            if (parsedResult.has("summary")) {
                JsonElement summaryElement = parsedResult.get("summary");

                if (summaryElement.isJsonArray()) {
                    // Scenario 1: It's a simple array of bullets
                    JsonArray summaryArray = summaryElement.getAsJsonArray();
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < summaryArray.size(); i++) {
                        sb.append("• ").append(summaryArray.get(i).getAsString()).append("\n");
                    }
                    finalSummary = sb.toString().trim();

                } else if (summaryElement.isJsonObject()) {
                    // Scenario 2: It's a complex nested object
                    JsonObject summaryObj = summaryElement.getAsJsonObject();
                    StringBuilder sb = new StringBuilder();

                    if (summaryObj.has("key_points") && summaryObj.get("key_points").isJsonArray()) {
                        sb.append("Key Points:\n");
                        JsonArray kpArray = summaryObj.getAsJsonArray("key_points");
                        for (int i = 0; i < kpArray.size(); i++) {
                            sb.append("• ").append(kpArray.get(i).getAsString()).append("\n");
                        }
                        sb.append("\n");
                    }
                    if (summaryObj.has("action_items") && summaryObj.get("action_items").isJsonArray()) {
                        sb.append("Action Items:\n");
                        JsonArray aiArray = summaryObj.getAsJsonArray("action_items");
                        for (int i = 0; i < aiArray.size(); i++) {
                            sb.append("• ").append(aiArray.get(i).getAsString()).append("\n");
                        }
                    }

                    finalSummary = sb.toString().trim();

                    // Absolute fallback just in case it's an object with totally different keys
                    if (finalSummary.isEmpty()) {
                        finalSummary = summaryObj.toString();
                    }

                } else {
                    // Scenario 3: It's just a normal paragraph of text
                    finalSummary = summaryElement.getAsString();
                }
            }

            result.put("summary", finalSummary);

            System.out.println("✅ Gemini finished generating Title and Summary!");
            return result;
        }
    }
}