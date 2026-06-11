import { useOutletContext } from 'react-router-dom'

interface LayoutContext {
  openSidebar: () => void
}

export function usePageLayout() {
  return useOutletContext<LayoutContext>()
}
