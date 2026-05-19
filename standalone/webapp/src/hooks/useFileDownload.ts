import { useCallback } from "react"

interface FileDownloadPayload {
  file: File | Blob
  fileName?: string
}

export const useFileDownload = () => {
  const downloadFile = useCallback(
    ({ file, fileName }: FileDownloadPayload) => {
      const link = document.createElement("a")
      link.href = window.URL.createObjectURL(file)

      // Set the file name for download
      if (fileName) {
        link.download = fileName
      } else if (file instanceof File) {
        link.download = file.name
      } else {
        link.download = "file"
      }

      // Append the link to the body, trigger the download, and remove the link
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup URL object
      window.URL.revokeObjectURL(link.href)
    },
    []
  )

  return downloadFile
}
