import { Icon } from "@/components/ui/Icon";

export const getLocationTypeIcon = (type: string) => {
  const cn = "w-4 h-4 text-lime-300";

  switch (type.toLowerCase().trim()) {
    case "shoot":
    case "shoot location":
      return <Icon name="shoot" className={cn + " stroke-1 stroke-lime-300"} />;

    case "hospital":
    case "nearest hospital":
      return <Icon name="hospital" className={cn} />;

    case "parking":
    case "truck parking":
      return <Icon name="parking" className={cn} />;

    default:
      return <Icon name="pin" className={cn} />;
  }
};
