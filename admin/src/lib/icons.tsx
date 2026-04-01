import {
  LayoutDashboard,
  FileText,
  Image,
  Layers,
  Tags,
  FileCode,
  Settings,
  Trash2,
  type LucideIcon,
  HelpCircle,
  Home,
  User,
  Users,
  Bell,
  Lock,
  Globe,
  Calendar,
  Clock,
  Link,
  Hash,
  ToggleLeft,
  ChevronDown,
  CheckSquare,
  Braces,
  Folder,
  MapPin,
  DollarSign,
  Mail,
  Phone,
  Package,
  Star,
  Heart,
  Flag,
  Bookmark,
  Archive,
  Edit,
  Eye,
  AlertCircle,
} from "lucide-react";

const iconRegistry: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Image,
  Layers,
  Tags,
  FileCode,
  Settings,
  Trash2,
  HelpCircle,
  Home,
  User,
  Users,
  Bell,
  Lock,
  Globe,
  Calendar,
  Clock,
  Link,
  Hash,
  ToggleLeft,
  ChevronDown,
  CheckSquare,
  Braces,
  Folder,
  MapPin,
  DollarSign,
  Mail,
  Phone,
  Package,
  Star,
  Heart,
  Flag,
  Bookmark,
  Archive,
  Edit,
  Eye,
  AlertCircle,
};

export function getIcon(name: string): LucideIcon | undefined {
  return iconRegistry[name];
}

export function Icon({
  name,
  className = "size-5",
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = iconRegistry[name];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent className={className} />;
}
