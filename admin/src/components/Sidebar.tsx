import { useState } from "react";
import { version } from "../../../package.json";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Layers, ChevronDown } from "lucide-react";
import { useAdminConfig } from "../contexts";
import { Icon } from "../lib/icons";
import { useApi } from "../embed/contexts/ApiContext";
import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from "./ui/collapsible";
import {
	Sidebar as ShadcnSidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	useSidebar,
} from "./ui/sidebar";
import { ContentTypeFormModal } from "./ContentTypeFormModal";
import type { NavItem } from "../lib/admin-config";

export function Sidebar() {
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const config = useAdminConfig();
	const { navItems, branding } = config;
	const api = useApi();
	const { setOpenMobile, isMobile } = useSidebar();

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const contentTypesResult = useQuery(api.listContentTypes, {
		isActive: true,
	});
	const contentTypes = contentTypesResult?.page ?? [];

	const isActive = (to: string, exact?: boolean) => {
		if (exact) {
			return currentPath === to;
		}
		return currentPath.startsWith(to);
	};

	const isContentActive =
		currentPath === "/content" ||
		currentPath.startsWith("/entries/type/") ||
		currentPath.startsWith("/entries/new/") ||
		currentPath.startsWith("/entries/");

	const closeMobileSheet = () => {
		if (isMobile) setOpenMobile(false);
	};

	const renderNavItem = (item: NavItem) => {
		if (item.id === "content") {
			return renderContentMenu(item);
		}

		return (
			<SidebarMenuItem key={item.id}>
				<SidebarMenuButton
					asChild
					isActive={isActive(item.path, item.exact)}
					onClick={closeMobileSheet}
				>
					<Link to={item.path}>
						<Icon name={item.icon} className="size-5" />
						<span>{item.label}</span>
						{item.badge && (
							<span className="ml-auto rounded-full bg-sidebar-primary px-2 py-0.5 text-xs text-sidebar-primary-foreground">
								{item.badge}
							</span>
						)}
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	};

	const renderContentMenu = (item: NavItem) => (
		<Collapsible
			key={item.id}
			defaultOpen={isContentActive}
			className="group/collapsible"
		>
			<SidebarMenuItem>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton isActive={isContentActive}>
						<Icon name={item.icon} className="size-5" />
						<span>{item.label}</span>
						<ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						<SidebarMenuSubItem>
							<SidebarMenuSubButton
								asChild
								isActive={currentPath === "/content"}
								onClick={closeMobileSheet}
							>
								<Link to="/content">All Entries</Link>
							</SidebarMenuSubButton>
						</SidebarMenuSubItem>
						{contentTypes.map((type) => (
							<SidebarMenuSubItem key={type._id}>
								<SidebarMenuSubButton
									asChild
									isActive={currentPath === `/entries/type/${type._id}`}
									onClick={closeMobileSheet}
								>
									<Link
										to="/entries/type/$contentTypeId"
										params={{ contentTypeId: type._id }}
									>
										{type.displayName}
									</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}
						{contentTypes.length === 0 && contentTypesResult !== undefined && (
							<SidebarMenuSubItem>
								<SidebarMenuSubButton
									onClick={() => setIsCreateModalOpen(true)}
									className="text-sidebar-foreground/60"
								>
									+ Create content type
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						)}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);

	return (
		<>
			<ShadcnSidebar collapsible="offcanvas" className="bg-sidebar">
				<SidebarHeader className="border-none">
					<Link
						to="/"
						className="flex h-14 items-center gap-2 px-2 font-semibold text-sidebar-foreground"
						onClick={closeMobileSheet}
					>
						{branding.logo ? (
							<img
								src={branding.logo}
								alt={branding.appName}
								className="size-8"
							/>
						) : (
							<div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Layers className="size-4" />
							</div>
						)}
						<span className="text-base">{branding.appName}</span>
					</Link>
				</SidebarHeader>

				<SidebarContent>
					{navItems.main.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>Main</SidebarGroupLabel>
							<SidebarMenu>{navItems.main.map(renderNavItem)}</SidebarMenu>
						</SidebarGroup>
					)}

					{navItems.config.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>Configuration</SidebarGroupLabel>
							<SidebarMenu>{navItems.config.map(renderNavItem)}</SidebarMenu>
						</SidebarGroup>
					)}
				</SidebarContent>

				<SidebarFooter className="border-t border-sidebar-border">
					<div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
						<span>Version</span>
						<span className="font-mono">{version}</span>
					</div>
				</SidebarFooter>
			</ShadcnSidebar>

			<ContentTypeFormModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
			/>
		</>
	);
}
