/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */  
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"; 

export const SlickTable: React.FC<{
    data?: any[];
    tableTitle?: string;
}> = ({
  data, 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []); 

  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };  
 

  return (
    <>
      {
        data?.length ===  0 ? (<> </>
        ) : (
          <div className="overflow-visible" > 
            <motion.div 
              className="border rounded-lg overflow-hidden"
              style={{ height: "400px", display: "flex", flexDirection: "column" }}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              variants={tableVariants}
            >
              <div className="overflow-auto flex-grow">
                <Table>
                  <TableHeader>
                    <TableRow> 
                      {
                        Object.keys((data)?.[0] ?? {}).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))
                      }
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {([ 
                      ...data ?? [],
                    ]) 
                      ?.map((item, index) => (
                        <motion.tr
                          key={index + "table-row"}
                          custom={index}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {
                            Object.keys(item ?? {}) 
                              .map((key) => (
                              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                <TableCell key={key}>{item?.[key as keyof typeof item]}</TableCell>
                              ))
                          }
                        </motion.tr>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </div>
        )
      }
    </>
  );
};