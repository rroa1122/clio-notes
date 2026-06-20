import { useState } from "react";
import {
    Building2,
    Users,
    Bell,
    Globe,
    Clock,
    UserPlus,
    MoreVertical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const sections = [
    { id: "profile", name: "Clinic Profile", icon: Building2 },
    { id: "users", name: "User Management", icon: Users },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "integration", name: "Integration", icon: Globe },
];

export function Settings() {
    const [activeSection, setActiveSection] = useState("profile");

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your clinic profile, users, and preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
                <div className="space-y-1">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeSection === section.id
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                }`}
                        >
                            <section.icon className="h-4 w-4" />
                            {section.name}
                        </button>
                    ))}
                </div>

                <div className="space-y-8">
                    {activeSection === "profile" && (
                        <div className="space-y-6">
                            <Card className="shadow-none border-border overflow-hidden">
                                <CardHeader className="bg-muted/10 border-b py-4 px-6">
                                    <CardTitle className="text-sm font-semibold">Clinic Profile</CardTitle>
                                    <CardDescription className="text-xs">Update your clinic's public information and operational hours.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-tight">Clinic Name</label>
                                            <Input defaultValue="Green Valley Medical Center" className="h-9 text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-tight">Timezone</label>
                                            <Input defaultValue="America/Los_Angeles" className="h-9 text-sm bg-muted/20" disabled />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-semibold">Business Hours</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-tight">Edit</Button>
                                        </div>
                                        <Separator className="bg-border/50" />
                                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                                            <span className="text-muted-foreground font-medium">Monday - Friday</span>
                                            <span className="text-right font-mono">08:00 AM - 05:00 PM</span>
                                            <span className="text-muted-foreground font-medium">Saturday - Sunday</span>
                                            <span className="text-right text-rose-500 font-mono">Closed</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button size="sm" className="h-9 font-bold px-6">Save Changes</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none border-border overflow-hidden">
                                <CardHeader className="bg-muted/10 border-b py-4 px-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-semibold">User Management</CardTitle>
                                            <CardDescription className="text-xs">Invite team members and manage their roles.</CardDescription>
                                        </div>
                                        <Button size="sm" variant="default" className="h-8 gap-2 text-xs font-semibold">
                                            <UserPlus className="h-3.5 w-3.5" />
                                            Invite User
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="h-9 py-0 text-[10px] font-bold uppercase">Name</TableHead>
                                                <TableHead className="h-9 py-0 text-[10px] font-bold uppercase">Email</TableHead>
                                                <TableHead className="h-9 py-0 text-[10px] font-bold uppercase">Role</TableHead>
                                                <TableHead className="h-9 py-0 text-right"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {[
                                                { name: "Dr. Sarah Jenkins", email: "sarah@greenvalley.com", role: "Owner" },
                                                { name: "Mark Wilson", email: "mark@greenvalley.com", role: "Manager" },
                                            ].map((user) => (
                                                <TableRow key={user.email} className="hover:bg-muted/10">
                                                    <TableCell className="py-3 text-sm font-medium">{user.name}</TableCell>
                                                    <TableCell className="py-3 text-sm text-muted-foreground">{user.email}</TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-border" />
                                                            <span className="text-xs font-medium">{user.role}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                                            <MoreVertical className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
