import React from "react"; 

export const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  );
};