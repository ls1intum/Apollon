import React from "react"
import { useFeedbackDragStart } from "@/hooks"

export const FeedbackBoxes: React.FC = () => {
  const handleDragStart = useFeedbackDragStart()

  return (
    <div className="flex flex-col gap-2 ">
      <div>Feedback Items</div>

      <div className="flex gap-2">
        <div
          className="w-20 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white"
          draggable
          onDragStart={(e) =>
            handleDragStart(e, {
              credits: 10,
              feedback: "Excellent work! Well implemented.",
            })
          }
        >
          +10
        </div>
        <div>Excellent work! Well implemented.</div>
      </div>

      <div className="flex gap-2">
        <div
          className="w-20 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white"
          draggable
          onDragStart={(e) =>
            handleDragStart(e, {
              credits: -5,
              feedback: "Needs improvement. Please review the requirements.",
            })
          }
        >
          -5
        </div>
        <div>Needs improvement. Please review the requirements.</div>
      </div>
      <div className="flex gap-2">
        <div
          className="w-20 h-12 bg-green-400 rounded-lg flex items-center justify-center text-white"
          draggable
          onDragStart={(e) =>
            handleDragStart(e, {
              credits: 5,
              feedback: "Good work! Minor improvements needed.",
            })
          }
        >
          +5
        </div>
        <div>Good work! Minor improvements needed.</div>
      </div>
    </div>
  )
}
