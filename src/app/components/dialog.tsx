import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CustomDialogProps {
  buttonText: string;
  dialogTitle: string;
  dialogDescription: string;
  children: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  showSaveButton?: boolean;
}

export function CustomDialog({
  buttonText,
  dialogTitle,
  dialogDescription,
  children,
  onSave,
  onCancel,
  showSaveButton = true,
}: CustomDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{buttonText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          {showSaveButton && onSave && <Button type="submit" onClick={onSave}>Save changes</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
