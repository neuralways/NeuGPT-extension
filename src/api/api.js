import axios from "axios"

const API = axios.create({

  baseURL: process.env.REACT_APP_API_URL,

  headers: {
    "X-API-Key": process.env.REACT_APP_API_SECRET
  }

})

export default API
