import { useState } from 'react';
import { youtubeAPI } from '../services/api';
import {
  Youtube,
  Search,
  MessageSquare,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

export default function YoutubeAnalyzer() {
  const [videoUrl, setVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState('sentiment');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'sentiment', label: 'Sentiment Analysis', icon: TrendingUp },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'transcript', label: 'Transcript', icon: FileText },
    { id: 'download', label: 'Download', icon: Download },
  ];

  const handleAnalyze = async (action) => {
    if (!videoUrl.trim()) return;

    setLoading(true);
    setResults(null);

    try {
      let response;
      switch (action) {
        case 'sentiment':
          response = await youtubeAPI.analyzeSentiments(videoUrl);
          break;
        case 'comments':
          response = await youtubeAPI.getComments(videoUrl);
          break;
        case 'transcript':
          response = await youtubeAPI.getTranscript(videoUrl);
          break;
        case 'download':
          response = await youtubeAPI.downloadVideo(videoUrl);
          break;
        default:
          break;
      }
      setResults(response.data);
      setActiveTab(action);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze video. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'negative':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-slate-400" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'negative':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-500" />
          YouTube Analyzer
        </h1>
        <p className="text-slate-400 mt-1">
          Analyze video sentiments, extract comments, transcripts, and download videos.
        </p>
      </div>

      {/* URL Input */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Video URL
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleAnalyze(tab.id)}
            disabled={loading || !videoUrl.trim()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && activeTab === tab.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <tab.icon className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-slate-700/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Sentiment Analysis Results */}
            {activeTab === 'sentiment' && results.sentiment_summary && (
              <div className="space-y-6">
                {/* Overall Sentiment */}
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Overall Sentiment</p>
                    <p className="text-2xl font-bold text-white capitalize">
                      {results.sentiment_summary.overall_sentiment}
                    </p>
                  </div>
                  {getSentimentIcon(results.sentiment_summary.overall_sentiment)}
                </div>

                {/* Sentiment Breakdown */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    Sentiment Breakdown
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(results.sentiment_summary.sentiment_counts || {}).map(
                      ([sentiment, count]) => (
                        <div
                          key={sentiment}
                          className={`p-4 rounded-lg border ${getSentimentColor(sentiment)}`}
                        >
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-sm capitalize">{sentiment}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Top Comments */}
                {results.top_comments && results.top_comments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      Top Comments Analysis
                    </h3>
                    <div className="space-y-3">
                      {results.top_comments.map((comment, index) => (
                        <div
                          key={index}
                          className="p-4 bg-slate-900 rounded-lg border border-slate-700"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-white mb-2">{comment.text}</p>
                              <p className="text-sm text-slate-400">
                                by {comment.author} • {comment.likes} likes
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getSentimentColor(
                                comment.sentiment
                              )}`}
                            >
                              {comment.sentiment}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comments Results */}
            {activeTab === 'comments' && results.comments && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400 mb-4">
                  {results.comments.length} comments found
                </p>
                {results.comments.map((comment, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-900 rounded-lg border border-slate-700"
                  >
                    <p className="text-white mb-2">{comment.text}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>by {comment.author}</span>
                      <span>{comment.likes} likes</span>
                      {comment.sentiment && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs capitalize ${getSentimentColor(
                            comment.sentiment
                          )}`}
                        >
                          {comment.sentiment}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Transcript Results */}
            {activeTab === 'transcript' && results.transcript && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-400">
                    {results.transcript.split(/\s+/).length} words
                  </p>
                  <button
                    onClick={() => copyToClipboard(results.transcript)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-700 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 max-h-96 overflow-y-auto">
                  <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">
                    {results.transcript}
                  </pre>
                </div>
              </div>
            )}

            {/* Download Results */}
            {activeTab === 'download' && results.download_url && (
              <div className="text-center py-8">
                <Download className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Video Ready for Download
                </h3>
                <p className="text-slate-400 mb-6">
                  Click the button below to download the video
                </p>
                <a
                  href={results.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Video
                </a>
              </div>
            )}

            {/* Generic message if no specific format */}
            {activeTab === 'download' && !results.download_url && results.message && (
              <div className="text-center py-8">
                <Check className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Success!</h3>
                <p className="text-slate-400">{results.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Enter a YouTube URL
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Paste a YouTube video URL above and choose an action to get started with
            sentiment analysis, comments extraction, transcripts, or video download.
          </p>
        </div>
      )}
    </div>
  );
}