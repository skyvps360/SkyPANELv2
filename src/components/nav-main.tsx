import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  label = "Platform",
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      isActive?: boolean
      items?: {
        title: string
        url: string
        isActive?: boolean
      }[]
    }[]
  }[]
  label?: string
}) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isItemActive = item.isActive || item.items?.some((sub) => sub.isActive)

          return (
            <SidebarMenuItem key={item.title}>
              {item.items?.length ? (
                isCollapsed ? (
                  // Collapsed state: Show popover with sub-items
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isItemActive}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-48 p-2">
                      <div className="space-y-1">
                        <div className="px-2 py-1.5 text-sm font-medium text-foreground">
                          {item.title}
                        </div>
                        {item.items?.map((subItem) => (
                          <div key={subItem.title}>
                            {subItem.items?.length ? (
                              <div className="space-y-1">
                                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                  {subItem.title}
                                </div>
                                {subItem.items?.map((nestedItem) => (
                                  <Link
                                    key={nestedItem.title}
                                    to={nestedItem.url}
                                    className="flex items-center rounded-md px-4 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                  >
                                    {nestedItem.title}
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <Link
                                to={subItem.url}
                                className="flex items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {subItem.title}
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  // Expanded state: Show normal collapsible
                  <Collapsible asChild defaultOpen={isItemActive}>
                    <>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} isActive={isItemActive}>
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="data-[state=open]:rotate-90">
                          <ChevronRight />
                          <span className="sr-only">Toggle</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              {subItem.items?.length ? (
                                <Collapsible asChild defaultOpen={subItem.isActive}>
                                  <>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuSubButton isActive={subItem.isActive}>
                                        <span>{subItem.title}</span>
                                      </SidebarMenuSubButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <SidebarMenuSub>
                                        {subItem.items?.map((nestedItem) => (
                                          <SidebarMenuSubItem key={nestedItem.title}>
                                            <SidebarMenuSubButton asChild isActive={nestedItem.isActive}>
                                              <Link to={nestedItem.url}>
                                                <span>{nestedItem.title}</span>
                                              </Link>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        ))}
                                      </SidebarMenuSub>
                                    </CollapsibleContent>
                                  </>
                                </Collapsible>
                              ) : (
                                <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                                  <Link to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              )}
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                )
              ) : (
                <SidebarMenuButton asChild tooltip={item.title} isActive={isItemActive}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
