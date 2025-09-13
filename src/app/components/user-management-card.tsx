
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Users, UserPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";


function AddUserDialog() {
    const { createUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;
        
        setIsSubmitting(true);
        try {
            await createUser(username, password);
            toast({
                title: "Pengguna Ditambahkan",
                description: `Pengguna '${username}' telah berhasil dibuat.`
            });
            setIsOpen(false);
            setUsername('');
            setPassword('');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal Menambah Pengguna',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan.'
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Tambah Pengguna
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                    <DialogDescription>
                        Buat akun pengguna baru untuk mengakses aplikasi.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-username" className="text-right">
                                Username
                            </Label>
                            <Input
                                id="new-username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="col-span-3"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-password" className="text-right">
                                Password
                            </Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="col-span-3"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                         <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Pengguna'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function UserManagementCard() {
    const { users } = useAuth();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Users /> Pengaturan Pengguna</CardTitle>
                <CardDescription>
                    Kelola pengguna yang dapat mengakses aplikasi. Hanya admin yang bisa melihat menu ini.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Role</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.username}</TableCell>
                                <TableCell className="capitalize">{user.role}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 justify-end">
                <AddUserDialog />
            </CardFooter>
        </Card>
    );
}
