import React from 'react'
import { connect } from 'react-redux'
import { Tetris } from '../components/Tetris'
import LandingPage from '../components/LandingPage'

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      screen: 'landing'
    }
  }

  playSolo = () => {
    this.setState({
      screen: 'game'
    })
  }

  playMultiplayer = () => {
    this.setState({
      screen: 'multiplayer'
    })
  }

  goHome = () => {
    this.setState({
      screen: 'landing'
    })
  }

  render() {
    if (this.state.screen === 'landing') {
      return (
        <LandingPage
          onPlaySolo={this.playSolo}
          onPlayMultiplayer={this.playMultiplayer}
        />
      )
    }

    if (this.state.screen === 'game') {
      return <Tetris />
    }

    if (this.state.screen === 'multiplayer') {
      return (
        <div className="multiplayer-placeholder">
          <h1>MULTIPLAYER</h1>
          <p>Multiplayer rooms are coming soon.</p>

          <button onClick={this.goHome}>
            ← BACK TO HOME
          </button>
        </div>
      )
    }

    return null
  }
}

export default connect()(App)