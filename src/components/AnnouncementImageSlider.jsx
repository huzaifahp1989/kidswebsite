import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function AnnouncementImageSlider({
  images = [],
  title = "Announcement",
  variant = "preview",
  startIndex = 0,
  onImageClick,
  onSlideChange,
  className = "",
}) {
  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    if (!api) return undefined;

    const onSelect = () => {
      const index = api.selectedScrollSnap();
      setCurrent(index);
      onSlideChange?.(index);
    };
    onSelect();
    api.on("select", onSelect);
    return () => api.off("select", onSelect);
  }, [api]);

  useEffect(() => {
    if (!api || startIndex == null) return;
    api.scrollTo(startIndex, true);
  }, [api, startIndex]);

  if (!images.length) return null;

  const isPopup = variant === "popup";
  const isLightbox = variant === "lightbox";
  const imageClass = isLightbox
    ? "max-h-[85vh] w-full object-contain"
    : isPopup
      ? "max-h-[70vh] w-full object-contain"
      : "h-40 w-full cursor-pointer object-cover transition hover:opacity-95 md:h-48";

  const wrapClass = isLightbox
    ? "bg-black"
    : isPopup
      ? "bg-gray-950/5"
      : "overflow-hidden bg-gray-100";

  if (images.length === 1) {
    const img = (
      <img
        src={images[0]}
        alt={title}
        className={imageClass}
        loading="lazy"
      />
    );

    return (
      <div className={`${wrapClass} ${className}`}>
        {onImageClick ? (
          <button type="button" className="block w-full" onClick={() => onImageClick(0)}>
            {img}
          </button>
        ) : (
          img
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${wrapClass} ${className}`}>
      <Carousel setApi={setApi} opts={{ startIndex, loop: true }} className="w-full">
        <CarouselContent className="-ml-0">
          {images.map((url, index) => (
            <CarouselItem key={`${url}-${index}`} className="pl-0">
              {onImageClick ? (
                <button type="button" className="block w-full" onClick={() => onImageClick(index)}>
                  <img src={url} alt={`${title} ${index + 1}`} className={imageClass} loading="lazy" />
                </button>
              ) : (
                <img src={url} alt={`${title} ${index + 1}`} className={imageClass} loading="lazy" />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 top-1/2 h-9 w-9 border-white/40 bg-black/50 text-white hover:bg-black/70" />
        <CarouselNext className="right-2 top-1/2 h-9 w-9 border-white/40 bg-black/50 text-white hover:bg-black/70" />
      </Carousel>
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {images.map((url, index) => (
          <button
            key={`dot-${url}-${index}`}
            type="button"
            aria-label={`Go to image ${index + 1}`}
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === current ? "w-6 bg-white" : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

AnnouncementImageSlider.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
  title: PropTypes.string,
  variant: PropTypes.oneOf(["preview", "popup", "lightbox"]),
  startIndex: PropTypes.number,
  onImageClick: PropTypes.func,
  onSlideChange: PropTypes.func,
  className: PropTypes.string,
};
