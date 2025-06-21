import React, { useState } from 'react';
import MemoForm from './components/MemoForm';

const App = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        <div className="flex justify-end p-4">
          <button
            onClick={() => setIsDark(!isDark)}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded"
          >
            {isDark ? 'ライトモード' : 'ダークモード'}
          </button>
        </div>
        <MemoForm />
      </div>
    </div>
  );
};

export default App;