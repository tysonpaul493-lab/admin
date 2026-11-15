import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Prevent any horizontal viewport panning/scrolling
if (typeof window !== 'undefined') {
  const lockHorizontalScroll = () => {
    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
    if (document.documentElement.scrollLeft !== 0) {
      document.documentElement.scrollLeft = 0;
    }
    if (document.body && document.body.scrollLeft !== 0) {
      document.body.scrollLeft = 0;
    }
  };

  window.addEventListener('scroll', lockHorizontalScroll, { passive: true });
  window.addEventListener('resize', lockHorizontalScroll, { passive: true });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

