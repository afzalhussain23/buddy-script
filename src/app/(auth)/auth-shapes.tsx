import Image from "next/image";

// Decorative background shapes shared by the login and register screens.
// Kept inside each page's section so they position relative to the auth layout
// wrapper, while living in one place to edit.
export function AuthShapes() {
  return (
    <>
      <div className="_shape_one">
        <Image
          src="/assets/images/shape1.svg"
          alt=""
          className="_shape_img"
          width={176}
          height={540}
        />
        <Image
          src="/assets/images/dark_shape.svg"
          alt=""
          className="_dark_shape"
          width={176}
          height={540}
        />
      </div>
      <div className="_shape_two">
        <Image
          src="/assets/images/shape2.svg"
          alt=""
          className="_shape_img"
          width={568}
          height={400}
        />
        <Image
          src="/assets/images/dark_shape1.svg"
          alt=""
          className="_dark_shape _dark_shape_opacity"
          width={576}
          height={408}
        />
      </div>
      <div className="_shape_three">
        <Image
          src="/assets/images/shape3.svg"
          alt=""
          className="_shape_img"
          width={568}
          height={548}
        />
        <Image
          src="/assets/images/dark_shape2.svg"
          alt=""
          className="_dark_shape _dark_shape_opacity"
          width={568}
          height={548}
        />
      </div>
    </>
  );
}
