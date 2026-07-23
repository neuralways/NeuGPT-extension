import { useRef, useState } from 'react';
import { CheckCircle, Upload } from 'lucide-react';

const REQUIRED_COLUMNS = ['Author', 'Post Text', 'Post Link', 'Email', 'Date', 'Company'];

export default function LinkedInUploader({ onFileSelect, isLoading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(2));
    onFileSelect(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const [file] = event.dataTransfer.files;
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (event) => {
    const [file] = event.target.files;
    if (file) handleFileSelect(file);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-300 ${
          isDragOver
            ? 'scale-[1.01] border-primary-400 bg-primary-50 dark:bg-primary-500/10'
            : 'border-slate-300 bg-slate-50 hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-500/60 dark:hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          {!fileName ? (
            <>
              <div className="rounded-full bg-primary-100 p-4 dark:bg-primary-500/10">
                <Upload className="h-8 w-8 text-primary-600 dark:text-primary-300" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Upload LinkedIn CSV</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Click to browse or drop your CSV file here.
                </p>
                <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                  {REQUIRED_COLUMNS.map((column) => (
                    <span
                      key={column}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300"
                    >
                      {column}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-green-100 p-4 dark:bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{fileName}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{fileSize} KB - ready to draft</p>
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <p className="text-sm text-blue-700 dark:text-blue-200">Reading CSV and drafting mails...</p>
        </div>
      )}
    </div>
  );
}
