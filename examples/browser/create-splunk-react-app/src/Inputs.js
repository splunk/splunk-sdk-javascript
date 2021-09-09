import React from 'react';
import './Inputs.css';

class Inputs extends React.Component {
    constructor(props) {
      super(props);
      this.handleUsernameChange = this.handleUsernameChange.bind(this);
      this.handlePasswordChange = this.handlePasswordChange.bind(this);
      this.handleQueryChange = this.handleQueryChange.bind(this);
      this.handleClickSearch = this.handleClickSearch.bind(this);
    }
  
    handleUsernameChange(e) {
        this.props.onUsernameChange(e.target.value);
    }

    handlePasswordChange(e) {
        this.props.onPasswordChange(e.target.value);
    }

    handleQueryChange(e) {
      this.props.onQueryChange(e.target.value);
    }

    handleClickSearch(e) {
        this.props.onClickSearch();
    }
  
    render() {
      return (
          <div className="Login">
            <label>Username</label>
            <input type="text" id="username" name="username" value={this.props.username} onChange={this.handleUsernameChange}></input><br/>
            <label>Password</label>
            <input type="password" id="password" name="password" value={this.props.password} onChange={this.handlePasswordChange}></input><br/>
            <br/>
            <label>SPL Query</label><br/>
            <div>
              <textarea id="query" name="query" value={this.props.query} onChange={this.handleQueryChange} rows="3" cols="80"></textarea>
            </div>
            <br/>
            <button onClick={this.handleClickSearch}>Search</button><br/>
          </div>
        );
    }
  }

  export default Inputs;