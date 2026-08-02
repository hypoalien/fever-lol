import { useState } from "react";
import { Button } from "./ui/button"; // Assuming you're using a UI library like shadcn/ui

interface TruncateTextProps {
  text: string;
  maxLength?: number;
}

const TruncateText = ({ text, maxLength = 150 }: TruncateTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const truncatedText = text.slice(0, maxLength);
  const shouldTruncate = text.length > maxLength;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <p className="text-muted-foreground md:text-xl">
        {isExpanded || !shouldTruncate ? text : `${truncatedText}...`}
      </p>
      {shouldTruncate && (
        <Button variant="link" onClick={toggleExpand}>
          {isExpanded ? "Read less" : "Read more"}
        </Button>
      )}
    </div>
  );
};

export default TruncateText;
