import React from 'react';
import './Login.css';

class Login extends React.Component {
    constructor(props) {
      super(props);
      this.handleUsernameChange = this.handleUsernameChange.bind(this);
      this.handlePasswordChange = this.handlePasswordChange.bind(this);
      this.handleClickSearch = this.handleClickSearch.bind(this);
    }
  
    handleUsernameChange(e) {
        this.props.onUsernameChange(e.target.value);
    }

    handlePasswordChange(e) {
        this.props.onPasswordChange(e.target.value);
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
            <input type="password" id="password" name="password" onChange={this.handlePasswordChange}></input><br/>
            <button onClick={this.handleClickSearch}>Search</button><br/>
          </div>
        );
    }
  }

  export default Login;