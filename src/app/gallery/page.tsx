import { redirect } from 'next/navigation'

export default function GalleryIndexPage() {
  // There is no public gallery listing — individual galleries are at /gallery/[id]
  // Redirect visitors to the landing page
  redirect('/')
}
