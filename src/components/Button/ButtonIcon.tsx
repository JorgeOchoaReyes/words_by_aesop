import { Mail } from "lucide-react";
 
import { Button } from "../ui/button";
 
export const IconButton: React.FC<{
    icon: React.ReactNode;
    text: string;
}> = ({
  icon,
  text
}) => {
  return (
    <Button>
      {icon ?? <Mail />} {text}
    </Button>
  );
};