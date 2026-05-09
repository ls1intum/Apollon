import { useModalContext } from "@/contexts/ModalContext"
import { useNavigate, useParams } from "react-router"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined"
import { formatUpadtedDate } from "@/utils/date"
import { useThemeStore } from "@/stores/useThemeStore"

export const LoadDiagramModal = () => {
  const { closeModal } = useModalContext()
  const navigate = useNavigate()
  const { id: currentDiagramId } = useParams()
  const currentTheme = useThemeStore((state) => state.currentTheme)
  const models = usePersistenceModelStore((state) => state.models)
  const deleteModel = usePersistenceModelStore((state) => state.deleteModel)

  const modelsList = Object.entries(models).map(
    ([id, persitanceModelEntity]) => ({
      id,
      title: persitanceModelEntity.model.title,
      type: persitanceModelEntity.model.type,
      lastModifiedAt: persitanceModelEntity.lastModifiedAt,
    })
  )

  const handleLoadingDiagram = (id: string) => {
    navigate(`/local/${id}`)
    closeModal()
  }

  const handleDeleteDiagram = (id: string) => {
    if (id === currentDiagramId) return
    deleteModel(id)
  }

  const currentModelIndex = modelsList.findIndex(
    (model) => model.id === currentDiagramId
  )
  const isCurrentModelOnTop = currentModelIndex === 0
  const isCurrentModelOnBottom = currentModelIndex === modelsList.length - 1

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg  ">
      {modelsList.map((model, index) => {
        const isSelected = model.id === currentDiagramId
        return (
          <div
            key={model.id}
            className={`flex flex-col cursor-pointer ${currentTheme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}${
              isSelected && isCurrentModelOnTop ? "rounded-t-lg" : ""
            } ${isSelected && isCurrentModelOnBottom ? "rounded-b-lg" : ""}`}
            onClick={() => handleLoadingDiagram(model.id)}
          >
            <div
              className={`flex p-2 justify-between items-center w-full ${
                isSelected ? "bg-blue-500 text-white" : ""
              }`}
            >
              <div className="flex gap-2 flex-col">
                <span
                  className="text-lg"
                  style={{ color: "var(--apollon-primary-contrast)" }}
                >
                  {model.title}
                </span>
                <span
                  className={`text-sm ${isSelected ? "" : "text-gray-500"}`}
                >
                  {model.type}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col">
                  <span
                    className={`${isSelected ? "text-white" : "text-gray-500"}`}
                  >
                    last updated:
                  </span>
                  <span
                    className={`text-sm ${isSelected ? "text-white" : "text-gray-500"}`}
                  >
                    {formatUpadtedDate(model.lastModifiedAt)}
                  </span>
                </div>
                {!isSelected && (
                  <DeleteOutlineOutlinedIcon
                    className="hover:bg-red-500 hover:text-white rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteDiagram(model.id)
                    }}
                    sx={{ width: 32, height: 32 }}
                  />
                )}
              </div>
            </div>
            {index !== modelsList.length - 1 && (
              <div className="border-b border-gray-300" />
            )}
          </div>
        )
      })}
    </div>
  )
}
