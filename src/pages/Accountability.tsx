import { ChecklistPage } from '@/pages/DailyChecklist'

export function Accountability() {
  return (
    <ChecklistPage
      mode="alpha"
      pageTitle="Alpha Mode"
      subtitle="Track your Alpha Mode habits. Mark any item to repeat every day."
      cardTitle="Alpha Mode"
      addPlaceholder="Add an Alpha Mode item..."
    />
  )
}
