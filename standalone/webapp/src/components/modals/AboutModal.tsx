import { appVersion, repositoryLink, apollonLibraryVersion } from "@/constants"
import { useModalContext } from "@/contexts"
import { Button } from "@mui/material"
import { Typography } from "../Typography"

export const AboutModal = () => {
  const { closeModal } = useModalContext()
  return (
    <div className="flex flex-col gap-6">
      <table>
        <tbody>
          <tr>
            <td>
              <Typography>App:</Typography>
            </td>
            <td>
              <Typography>
                <a
                  className="text-blue-500 hover:text-purple-800"
                  href={repositoryLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Apollon
                </a>
                {` ${appVersion}`}
              </Typography>
            </td>
          </tr>
          <tr>
            <td>
              <Typography>Library:</Typography>
            </td>
            <td>
              <Typography>
                <a
                  className="text-blue-500 hover:text-purple-800"
                  href={`https://www.npmjs.com/package/@tumaet/apollon`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @tumaet/apollon
                </a>
                {` ${apollonLibraryVersion}`}
              </Typography>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="w-full h-[1px] bg-gray-400" />

      <Button
        variant="contained"
        color="primary"
        onClick={closeModal}
        className="self-end"
      >
        Close
      </Button>
    </div>
  )
}
