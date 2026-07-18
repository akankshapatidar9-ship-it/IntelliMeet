import React, { useState, useEffect } from 'react';

const ProcessingState = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  // The messages we want to cycle through
  const messages = [
    "🎧 Extracting audio from meeting...",
    "🧠 AI is listening to the conversation...",
    "🗣️ Identifying different speakers...",
    "📝 Generating transcript text...",
    "✨ Creating smart summary..."
  ];

  useEffect(() => {
    // Change message every 3 seconds
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center py-5">
      {/* Animated Spinner/Pulse */}
      <div className="spinner-grow text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      
      {/* Cycling Text with Fade Animation */}
      <h5 className="fw-bold text-dark animate-fade">
        {messages[messageIndex]}
      </h5>
      <p className="text-muted small">Please wait, this usually takes 30-60 seconds.</p>

      {/* Simple CSS for fade effect */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade {
            animation: fadeIn 0.5s ease-in-out;
          }
        `}
      </style>
    </div>
  );
};

export default ProcessingState;