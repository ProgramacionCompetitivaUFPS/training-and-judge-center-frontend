// Task 12.3: Keyboard navigation tests for Tabs
// **Validates: Requirements 11.3**

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs'

function TestTabs({ defaultValue = 'tab1' }: { defaultValue?: string }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="tab1">Tab One</TabsTrigger>
        <TabsTrigger value="tab2">Tab Two</TabsTrigger>
        <TabsTrigger value="tab3">Tab Three</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content One</TabsContent>
      <TabsContent value="tab2">Content Two</TabsContent>
      <TabsContent value="tab3">Content Three</TabsContent>
    </Tabs>
  )
}

describe('Tabs keyboard navigation', () => {
  it('renders the tablist with correct roles', () => {
    render(<TestTabs />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('shows the default tab content on initial render', () => {
    render(<TestTabs />)

    expect(screen.getByText('Content One')).toBeInTheDocument()
  })

  it('navigates to the next tab with ArrowRight', async () => {
    const user = userEvent.setup()
    render(<TestTabs />)

    // Focus the first tab
    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[0])
    expect(tabs[0]).toHaveFocus()

    // Press ArrowRight to move to the next tab
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()

    // Radix Tabs activates on focus by default — content should switch
    expect(screen.getByText('Content Two')).toBeInTheDocument()
  })

  it('navigates to the previous tab with ArrowLeft', async () => {
    const user = userEvent.setup()
    render(<TestTabs defaultValue="tab2" />)

    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[1])
    expect(tabs[1]).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(tabs[0]).toHaveFocus()
    expect(screen.getByText('Content One')).toBeInTheDocument()
  })

  it('wraps focus from last tab to first with ArrowRight', async () => {
    const user = userEvent.setup()
    render(<TestTabs defaultValue="tab3" />)

    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[2])
    expect(tabs[2]).toHaveFocus()

    // ArrowRight from last tab should wrap to first
    await user.keyboard('{ArrowRight}')
    expect(tabs[0]).toHaveFocus()
  })

  it('wraps focus from first tab to last with ArrowLeft', async () => {
    const user = userEvent.setup()
    render(<TestTabs />)

    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[0])
    expect(tabs[0]).toHaveFocus()

    // ArrowLeft from first tab should wrap to last
    await user.keyboard('{ArrowLeft}')
    expect(tabs[2]).toHaveFocus()
  })

  it('activates a tab with Enter key', async () => {
    const user = userEvent.setup()
    render(<TestTabs />)

    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[0])

    // Navigate to second tab
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()

    // Press Enter to activate (Radix auto-activates on focus, but Enter should also work)
    await user.keyboard('{Enter}')
    expect(screen.getByText('Content Two')).toBeInTheDocument()
  })

  it('activates a tab with Space key', async () => {
    const user = userEvent.setup()
    render(<TestTabs />)

    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[0])

    // Navigate to third tab
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(tabs[2]).toHaveFocus()

    // Press Space to activate
    await user.keyboard(' ')
    expect(screen.getByText('Content Three')).toBeInTheDocument()
  })
})
