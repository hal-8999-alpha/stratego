import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import store from './store'
import './assets/styles/main.scss'

const app = createApp(App)
app.use(store)
app.mount('#app') 