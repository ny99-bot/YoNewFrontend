
import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        :root {
          --primary: 219 100% 61%;
          --primary-foreground: 0 0% 100%;
        }
        
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
      
      {children}
    </div>
  );
}
