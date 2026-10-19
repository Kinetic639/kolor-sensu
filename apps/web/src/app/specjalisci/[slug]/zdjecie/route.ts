import { getSpecialist } from "@/lib/public-data";

// A specialist's photo at a lasting address, for the profile's data for
// Google (Person.image): the photo itself is served through a signed URL
// that expires, so this sends to a freshly signed one each time. Only for
// published, visible profiles (getSpecialist); otherwise 404.

export async function GET(
  _request: Request,
  { params }: RouteContext<"/specjalisci/[slug]/zdjecie">,
) {
  const { slug } = await params;
  const specialist = await getSpecialist(slug);
  const photo = specialist?.photoUrl ?? specialist?.portraitUrl;
  if (!photo) return new Response(null, { status: 404 });
  return Response.redirect(photo, 307);
}
