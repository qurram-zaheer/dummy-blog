import Vuex from "vuex";
import axios from "axios";
import Cookie from 'js-cookie'


const createStore = () => {
  return new Vuex.Store({
    state: {
      loadedPosts: [],
      token: null
    },
    mutations: {
      setPosts(state, posts) {
        state.loadedPosts = posts;
      },
      addPost(state, post) {
        state.loadedPosts.push(post)
      },
      editPost(state, editedPost) {
        const postIndex = state.loadedPosts.findIndex(
          post => post.id === editedPost.id
        );
        state.loadedPosts[postIndex] = editedPost
      },
      setToken(state, token) {
        state.token = token
      },
      clearToken(state) {
        state.token = null
      }
    },
    actions: {
      nuxtServerInit(vuexContext, context) {
        return axios
          .get(process.env.baseUrl + "/posts.json")
          .then(res => {
            const postsArray = [];
            for (const key in res.data) {
              postsArray.push({ ...res.data[key], id: key });
            }
            vuexContext.commit("setPosts", postsArray);
          })
          .catch(e => context.error(e));
      },
      addPost(vuexContext, post) {
        const createdPost = {
          ...post,
          updatedDate: new Date()
        }
        return axios
          .post("https://nuxt-blog-880b1.firebaseio.com/posts.json?auth=" + vuexContext.state.token, createdPost)
          .then(result => {
            vuexContext.commit('addPost', { ...createdPost, id: result.data.name })
          })
          .catch(e => console.log(e));
      },
      editPost(vuexContext, editedPost) {
        return axios.put("https://nuxt-blog-880b1.firebaseio.com/posts" +
          editedPost.id +
          ".json?auth=" + vuexContext.state.token, editedPost)
          .then(res => {
            console.log(editedPost)
            vuexContext.commit('editPost', editedPost)
          })
          .catch(e => console.log(e))
      },
      setPosts(vuexContext, posts) {
        vuexContext.commit("setPosts", posts);
      },
      authenticateUser(vuexContext, authData) {
        let url =
          "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
          process.env.firebaseKey;

        if (!authData.isLogin) {
          url =
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" +
            process.env.firebaseKey;
        }
        axios
          .post(url, {
            email: authData.email,
            password: authData.password,
            returnSecureToken: true
          })
          .then(res => {
            vuexContext.commit("setToken", res.data.idToken)
            localStorage.setItem('token', res.data.idToken)
            localStorage.setItem('expiryTime', new Date().getTime() + Number.parseInt(res.data.expiresIn) * 1000)
            Cookie.set('jwt', res.data.idToken)
            Cookie.set('expirationDate', new Date().getTime() + Number.parseInt(res.data.expiresIn) * 1000)
            return axios.post('http://localhost:3000/api/track-data', { data: 'Reached' })
          })
          .catch(err => console.log(err));
      },
      setLogoutTimer(vuexContext, duration) {
        setTimeout(() => { vuexContext.commit('clearToken') }, duration)
      },
      initAuth(vuexContext, req) {
        let token;
        let expirationDate;
        if (req) {
          if (!req.headers.cookie) {
            return;
          }
          const jwtCookie = req.headers.cookie.split(";").find(c => c.trim().startsWith('jwt='))
          if (!jwtCookie) {
            return;
          }
          token = jwtCookie.split("=")[1]
          expirationDate = req.headers.cookie.split(";").find(c => c.trim().startsWith('expirationDate=')).split("=")[1]
        } else if (process.client) {
          token = localStorage.getItem('token')
          console.log("HELLO")
          expirationDate = localStorage.getItem('expiryTime')


        } else {
          token = null
          expirationDate = null
        }
        if (new Date().getTime() > +expirationDate || !token) {
          console.log("No token")
          vuexContext.dispatch('logout')
        }
        vuexContext.dispatch("setLogoutTimer", +expirationDate - new Date().getTime())
        vuexContext.commit('setToken', token)

      },
      logout(vuexContext) {
        console.log("logging out")
        vuexContext.commit('clearToken')
        Cookie.remove('jwt')
        Cookie.remove('expirationDate')
        if (process.client) {
          localStorage.removeItem('token')
          localStorage.removeItem('expiryTime')
        }

      }
    },
    getters: {
      loadedPosts(state) {
        return state.loadedPosts;
      },
      isAuthenticated(state) {
        return state.token != null
      }
    }
  });
};

export default createStore;
