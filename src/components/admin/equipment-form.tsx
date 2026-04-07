"use client";

import { useState, useTransition } from "react";
import { createEquipment, updateEquipment, uploadEquipmentImage, archiveEquipment } from "@/actions/equipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Upload } from "lucide-react";
import type { EquipmentCategory, Equipment } from "@/types/database";

interface EquipmentFormProps {
  categories: EquipmentCategory[];
  equipment?: Equipment | null;
  onSuccess?: () => void;
}

export function EquipmentFormDialog({ categories, equipment, onSuccess }: EquipmentFormProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(equipment?.image_url || "");
  const [isPending, startTransition] = useTransition();
  const isEditing = !!equipment;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateEquipment(equipment!.id, formData)
        : await createEquipment(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEditing ? "Equipment updated" : "Equipment added");
        setOpen(false);
        onSuccess?.();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="outline" size="sm">Edit</Button>
        ) : (
          <Button variant="fsuu" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Equipment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Equipment" : "Add New Equipment"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update equipment details"
              : "Add a new equipment item to the inventory"}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Equipment Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={equipment?.name || ""}
              placeholder="e.g., Epson LCD Projector"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select name="category_id" defaultValue={equipment?.category_id || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_quantity">Total Quantity *</Label>
              <Input
                id="total_quantity"
                name="total_quantity"
                type="number"
                min={1}
                defaultValue={equipment?.total_quantity || 1}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={equipment?.description || ""}
              placeholder="Brief description of the equipment"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={equipment?.status || "available"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select name="condition" defaultValue={equipment?.condition || "good"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                name="serial_number"
                defaultValue={equipment?.serial_number || ""}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={equipment?.location || "PMO Office"}
                placeholder="e.g., PMO Office"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={equipment?.notes || ""}
              placeholder="Additional notes"
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="image_url">Equipment Image (URL)</Label>
            <div className="flex gap-2">
              <Input
                id="image_url"
                name="image_url"
                type="url"
                defaultValue={equipment?.image_url || ""}
                placeholder="https://images.unsplash.com/..."
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Paste a direct image link from the web (e.g. Unsplash, Google Images)
            </p>
            {imageUrl && (
              <div className="mt-2 relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="object-cover w-full h-full"
                  onError={() => {
                    toast.error("Invalid image URL");
                    setImageUrl("");
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="fsuu" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isEditing ? "Update" : "Add Equipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
