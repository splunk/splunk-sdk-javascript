import React from 'react';
import './App.css';
import SplunkJsExample from './SplunkJsExample';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          1. Edit <code>src/splunkConfig.js</code> to input your Splunk host/port information and restart this project using <code>npm start</code>.
        </p>

        <p>
          2. Enter credentials below and click <code>Search</code> to login, run a sample search, and display the results.
        </p>

        <SplunkJsExample />

      </header>
    </div>
  );
}

export default App;
