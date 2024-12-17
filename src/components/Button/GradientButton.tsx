import { motion } from "framer-motion";

interface GradientButtonProps {
  text: string;
  linkTo?: string;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  text,
  linkTo,
}) => {
  return (
    <button className="text-white font-medium px-3 py-2 rounded-md overflow-hidden relative transition-transform hover:scale-105 active:scale-95" onClick={() => {
      if (linkTo) {  
        window.location.replace(linkTo);
      }
    }}>
      <span className="relative z-10 font-bold">{text}</span>
      <motion.div
        initial={{ left: 0 }}
        animate={{ left: "-300%" }}
        transition={{
          repeat: Infinity,
          repeatType: "mirror",
          duration: 4,
          ease: "linear",
        }}
        // className="bg-[linear-gradient(to_right,#618070,#3b82f6)] absolute z-0 inset-0 w-[400%]"
        className="bg-[linear-gradient(to_right,#8f14e6,#e614dc,#e61453,#e68414)] absolute z-0 inset-0 w-[400%]"
      ></motion.div>
    </button>
  );
}; 