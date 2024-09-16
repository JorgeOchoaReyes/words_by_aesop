import { Loader2 } from "lucide-react";
 
import { Button } from "../ui/button";
import React from "react";
 
export const LoadingButton: React.FC<{
    text?: string;
    onClick?: () => void;
    loading?: boolean;
    children?: React.ReactNode;
}> = ({
  text,
  loading = false,
  onClick,
  children
}) => {
  return (
    <Button disabled={loading} onClick={onClick}>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {loading ? "Loading..." : text}
      {children}
    </Button>
  );
};