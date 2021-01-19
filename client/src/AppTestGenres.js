/* client/src/App.js */

import React, { Component } from 'react';
import './App.css';
import * as SpotifyWebApi from 'spotify-web-api-js';

// import SpotifyWebApi from 'spotify-web-api-js';
import im from './butters.gif'

const spotifyApi = new SpotifyWebApi();
//spotifyApi.setAccessToekn('BQCLl07DUYcof2ggwXDPOmKylPua9LLQVjlDvWwaVditqYiFGbG-ZmkEv4SkYGqbQvsSkNQk51sAQu92Psd2ZiZAqXb0vT7nLlE75c1bdUjrIFjYucr9IggxfnDHYPDau4V76IbjSUuLCyyKrymjjH_WC5DvXyD-VA&refresh_token=AQCYsSyzA9UY_8CrL-nWYQQBXSW7NUcuTFGOXN4vBMuopJ8A4jhoaQh_6jMPDI2ya2VXrmAYhbv3b7T2yJm56_nHFM0kOLStmcnODUP-fyfgWCHsBC7YPdPES6aV-OhZtPog6w');
// spotifyApi.setPromiseImplementation();

class App extends Component {
  constructor(){
    super();
    const params = this.getHashParams();
    const token = params.access_token;
    if (token) {
      spotifyApi.setAccessToken(token);
    }
    this.state = {
      loggedIn: token ? true : false,
      nowPlaying: { trackName: '', previous: 'None', albumArt: '', artists_id:''},
      genreArray: ''
    }
  }


  getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    e = r.exec(q)
    while (e) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
       e = r.exec(q);
    }
    return hashParams;
  }


// Calls Spotify API to get the track info
  getNowPlaying(){

    // get Elvis' albums, passing a callback. When a callback is passed, no Promise is returned
// spotifyApi.getMyCurrentPlaybackState( function (err, data) {
//   if (err) console.error(err);
//   else console.log('Artist albums', data);
// });

// get Elvis' albums, using Promises through Promise, Q or when
// spotifyApi.getMyCurrentPlaybackState().then(
//   function (data) {
//           this.setState({
//           nowPlaying: {
//               trackName: data.item.name,
//               previous: this.state.nowPlaying.previous,
//               albumArt: data.item.album.images[0].url,
//               artists_id: data.item.id.toString()
//             }
//         });
//   },
//   function (err) {
//     console.error(err);
//   }
// );

    // track detail information for album tracks
// spotifyApi
//   .getAlbum('5U4W9E5WsYb2jUQWePT8Xm')
//   .then(function (data) {
//     return data.tracks.map(function (t) {
//       return t.id;
//     });
//   })
//   .then(function (trackIds) {
//     return spotifyApi.getTracks(trackIds);
//   })
//   .then(function (tracksInfo) {
//     console.log(tracksInfo);
//   })
//   .catch(function (error) {
//     console.error(error);
//   });
    spotifyApi.getMyCurrentPlaybackState()
      .then((data) => {
        this.setState({
          nowPlaying: {
              trackName: data.item.name,
              previous: this.state.nowPlaying.previous,
              albumArt: data.item.album.images[0].url,
              artists_id: data.item.artists[0].id
            }
        });
        var artistId = data.item.artists[0].id;
        console.log(artistId);
        // return artistId;
      })

      // .then(() => {
      //   console.log(spotifyApi.getArtist('0iaaC8u9i7raiIoM4Eu2Cn'));
      // })


      // spotifyApi.getArtist(artistId).then((data) => {
      //   console.log(data);
      // });

      // .then(())

      .catch(error => console.log('Spotify is closed: ' + error.message));

      // spotifyApi.getArtist(artistId).then((response) => {
      //   console.log(response);
      //   // return spotifyApi.getArtist(artistId);
      // });
    }

getArtistInfo(info){
  // var artistId = this.state.nowPlaying.artists_id;
  // console.log('Test  ' + info);
  // spotifyApi.getArtist(info, function (err, data) {
  // if (err) console.error(err);
  // else console.log('Artist albums', data);
//   spotifyApi.getArtist(info, function (err, data) {
//   if (err) console.error(err);
//   else console.log('Artist albums', data);
// });

  spotifyApi.getArtist(''+info)
  .then((response) => {
    console.log(response.genres);
    // return data.genres
    this.setState({
      genreArray: response.genres}
    );
    // console.log(data.genres)
  })
    .catch(err => console.log('Spotify is closed: ' + err.message));
  }

  render() {
    return (
      <div className="App">
        <a href='http://localhost:8888' > Login to Spotify </a>
        <div>
          <img src={im} style={{ height: 300 }}/>
        </div>
        <div>
        Previous Song: { this.state.nowPlaying.previous }
        </div>
        <div>
          <img src={this.state.nowPlaying.albumArt} style={{ height: 300 }}/>
        </div>
        <div id = 'track'>
        Current Song: { this.state.nowPlaying.trackName }</div>
        <div>
        Artist ID: { this.state.nowPlaying.artists_id}
        </div>
        { this.state.loggedIn }
      </div>
    );
  }

  componentDidMount(){

// Checking to see if the page needs to update
    this.myInterval = setInterval(() => {
// Makes sure the song gets checked to compare
      this.getNowPlaying();
      this.getArtistInfo(this.state.nowPlaying.artists_id);
      
      
// If it's the same it won't do anything
      if (this.state.nowPlaying.trackName === this.state.nowPlaying.previous){
        // console.log('Same song')
        return;
      }
/* If it's different it will set the previous track to the current track
and update teh current track*/
      else if (this.state.nowPlaying.trackName !== this.state.nowPlaying.previous){

        // console.log('Current: ' + this.state.nowPlaying.trackName);
        // console.log('Previous: ' + this.state.nowPlaying.previous);
        this.setState({nowPlaying: {
            trackName: this.state.nowPlaying.trackName,
            previous: this.state.nowPlaying.trackName,
            albumArt: this.state.nowPlaying.albumArt,
            artists_id: this.state.nowPlaying.artists_id
          }
        })

        
        // console.log(this.state.artistInfo.genreArray);
      }
  }, 3000)}


}


export default App;
