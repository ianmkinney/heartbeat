import React from 'react';

const VideoBackground = () => {
  return (
    <div className="video-background">
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="video-element"
      >
        <source src="/AdobeStock_1206143024.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoBackground;