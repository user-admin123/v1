import { ItemType } from "@/lib/types";

interface Props {
  type: ItemType;
  size?: "sm" | "md";
}

const VegBadge = ({ type, size = "sm" }: Props) => {
  const isVeg = type === "veg";
  const dim = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const dot = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <div
      className={`${dim} rounded-sm border-2 flex items-center justify-center shrink-0`}
      style={{
        borderColor: isVeg ? "#22c55e" : "#ef4444",
      }}
      title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
    >
      <div
        className={`${dot} rounded-sm`}
        style={{ backgroundColor: isVeg ? "#22c55e" : "#ef4444" }}
      />
    </div>
  );
};

export default VegBadge;
