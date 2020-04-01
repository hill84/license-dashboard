import React from 'react';
import styles from './app.module.css';
import Dashboard from './components/dashboard';

const App = () => {
  return (
    <div className={styles.app}>
      <h1>License dashboard</h1>
      <Dashboard />
    </div>
  );
}

export default App;
