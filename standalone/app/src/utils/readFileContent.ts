export const readFileContent = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") {
        resolve(result)
      } else {
        reject(new Error("File content is not a string."))
      }
    }
    reader.onerror = () => {
      reject(new Error("Error reading file."))
    }
    reader.readAsText(file)
  })
}
