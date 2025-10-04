import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@/api/entities";

export function AskForLoginModal({
    open,
    onClose,
    title,
    description,
}) {
    return (
      <>
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm text-center">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col gap-2">
                    <Button onClick={() => User.login()}>立即登入</Button>
                    <Button variant="outline" onClick={onClose}>
                        取消
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </>

    );
}
