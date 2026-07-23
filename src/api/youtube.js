import axios from "axios"


// Create axios instance
const API = axios.create({

  // Backend URL
  baseURL: process.env.REACT_APP_API_URL,



  // Default headers
  headers: {

    // Backend API key
    "X-API-Key": process.env.REACT_APP_API_SECRET,

    // JSON type
    "Content-Type": "application/json"
  }
})




// API function
export const analyzeYoutubeVideo = async (
  youtubeUrl,
  maxComments
) => {

  // Send POST request
  const response = await API.post(
    "/youtube/analyze-sentiments",
    {

      // Request body
      url: youtubeUrl,

      max_comments: maxComments
    }
  )



  // Return only JSON data
  return response.data
}
