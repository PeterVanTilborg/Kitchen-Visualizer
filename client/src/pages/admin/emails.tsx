import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, Mail, Loader2, Image, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { EmailSubmission, GeneratedImage } from "@shared/schema";

type EmailWithImages = EmailSubmission & { images: GeneratedImage[] };

export default function AdminEmails() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImages, setSelectedImages] = useState<GeneratedImage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: emails = [], isLoading } = useQuery<EmailWithImages[]>({
    queryKey: ["/api/admin/emails-with-images"],
  });

  const handleViewImages = (images: GeneratedImage[]) => {
    setSelectedImages(images);
    setIsDialogOpen(true);
  };

  const filteredEmails = emails.filter((email) =>
    email.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    const csvContent = [
      ["Email", "Date", "Color ID", "Options"].join(","),
      ...emails.map((e) =>
        [e.email, e.submittedAt, e.colorId || "", e.options.join("; ")].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Email Submissions</h1>
          <p className="text-muted-foreground">
            View and export collected email addresses
          </p>
        </div>
        <Button onClick={handleExport} disabled={emails.length === 0} data-testid="button-export-emails">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>All Emails ({emails.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-emails"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No emails match your search"
                  : "No email submissions yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Options Selected</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((email) => (
                  <TableRow key={email.id} data-testid={`row-email-${email.id}`}>
                    <TableCell className="font-medium">{email.email}</TableCell>
                    <TableCell>
                      {format(new Date(email.submittedAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      {email.options.length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {email.options.join(", ")}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {email.images.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewImages(email.images)}
                          data-testid={`button-view-image-${email.id}`}
                        >
                          <Image className="w-4 h-4 mr-2" />
                          View ({email.images.length})
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">No image</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generated Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {selectedImages.map((image) => (
              <div key={image.id} className="space-y-2">
                <img
                  src={image.imageData}
                  alt="Generated car wrap"
                  className="w-full rounded-md"
                  data-testid={`img-generated-${image.id}`}
                />
                <p className="text-sm text-muted-foreground">
                  Created: {format(new Date(image.createdAt), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
