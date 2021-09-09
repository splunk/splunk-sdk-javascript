import React from 'react';
import './SplunkJsExample.css';
import Inputs from './Inputs';
import * as splunkjs from 'splunk-sdk';

// jquery.ajax is used for the underlying http client in ProxyHttp
window.$ = require('jquery');

//const splunkjs = require('splunk-sdk');
const Async  = splunkjs.Async;
const clientHttp = require('splunk-sdk/lib/platform/client/proxy_http');

class SplunkJsExample extends React.Component {
    constructor(props) {
      super(props);
      // We define handlers here as well as Inputs.js in order to lift
      // the username and password states up so that they can be used
      // here to run and populate search results.
      // More info on lifting state: https://reactjs.org/docs/lifting-state-up.html
      this.handleUsernameChange = this.handleUsernameChange.bind(this);
      this.handlePasswordChange = this.handlePasswordChange.bind(this);
      this.handleQueryChange = this.handleQueryChange.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.state = {
          username: 'admin',
          password: 'changed!',
          query: 'search index=_internal | head 3',
          results: [],
      };
    }
  
    handleUsernameChange(username) {
        this.setState({username: username});
    }

    handlePasswordChange(password) {
        this.setState({password: password});
    }

    handleQueryChange(query) {
        this.setState({query: query});
    }

    handleSearch() {
        var http = new clientHttp.ProxyHttp('/proxy');
        var service = new splunkjs.Service(http, {
            username: this.state.username,
            password: this.state.password,
            scheme: 'https', // we have configured this example for HTTPS
            host: 'localhost', // this is the host for our http-proxy-middleware server, do not change
            port: '3000' // this is the port for our http-proxy-middleware server, do not change
        });

        var that = this;
        Async.chain([
        // First, we log in
        function(done) {
            service.login(done);
        },
        // Perform the search
        function(success, done) {
            if (!success) {
                done('Error logging in');
            }
            
            service.search(`${that.state.query}`, {}, done);
        },
        // Wait until the job is done
        function(job, done) {
            job.track({}, function(job) {
                // Ask the server for the results
                job.results({}, done);
            });
        },
        // Print out the statistics and get the results
        function(results, job, done) {
            // Print out the statistics to the console
            console.log('Splunk Search Job Statistics:');
            console.log(`  Event Count: ${job.properties().eventCount}`);
            console.log(`  Disk Usage: ${job.properties().diskUsage} bytes`);
            console.log(`  Priority: ${job.properties().priority}`);
            console.log(results);
            that.setState({results: results});
        }],
        function(err) {
            console.error(err);        
        }
        );
    }
  
    render() {
      const results = this.state.results;

      // Find the index of the fields we want
      const timeIndex = (results.fields || []).indexOf('_time');
      const sourceIndex = (results.fields || []).indexOf('source');
      const sourcetypeIndex = (results.fields || []).indexOf('sourcetype');
      const rawIndex = (results.fields || []).indexOf('_raw');
      
      return (
        <div className='SplunkExample'>
            <Inputs
                username={this.state.username}
                password={this.state.password}
                query={this.state.query}
                onUsernameChange={this.handleUsernameChange} 
                onPasswordChange={this.handlePasswordChange}
                onQueryChange={this.handleQueryChange}
                onClickSearch={this.handleSearch} />
            
            <h3>Results</h3>
            <table className='Results'>
                <thead>
                    <tr><th>_time</th><th>source</th><th>sourcetype</th><th>_raw</th></tr>
                </thead>
                <tbody>
                    {(results.rows || []).map((result, i) => {
                        return <tr key={i.toString()}><td>{result[timeIndex]}</td><td>{result[sourceIndex]}</td><td>{result[sourcetypeIndex]}</td><td>{result[rawIndex]}</td></tr>;
                    })}
                    <tr></tr>
                </tbody>
            </table>
        </div>
        );
    }
  }

  export default SplunkJsExample;