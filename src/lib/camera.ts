"use client";

/**
 * Camera frontală cu câmpul vizual întreg. 640×480 (4:3) face ca multe camere 16:9 să taie din
 * margini, iar imaginea pare „mărită”; cerem 1280×720 și, unde se poate, zoom-ul minim.
 */
export async function openCamera(): Promise<MediaStream> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 16 / 9 } },
      audio: false,
    });
  } catch (e) {
    // Camere vechi care refuză cererea: orice cameră frontală e mai bună decât niciuna.
    if ((e as DOMException)?.name !== "OverconstrainedError") throw e;
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
  }
  await zoomOut(stream);
  return stream;
}

/** Pe telefoanele care expun zoom-ul camerei (Chrome pe Android), îl punem la minim. */
async function zoomOut(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  try {
    const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number } }) | undefined;
    if (track && caps?.zoom && typeof caps.zoom.min === "number") {
      await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet] });
    }
  } catch {
    // zoom-ul nu e suportat: rămâne cel implicit
  }
}

/** Raportul real al imaginii (lățime / înălțime), ca rama să nu taie din cadru. */
export function videoAspect(video: HTMLVideoElement | null): number | null {
  if (!video || !video.videoWidth || !video.videoHeight) return null;
  return video.videoWidth / video.videoHeight;
}
