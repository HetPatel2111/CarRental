import  ImageKit  from "imagekit";

// console.log("KEY:", process.env.IMAGEKIT_PUBLIC_KEY);

var imageKit = new ImageKit({
    publicKey:process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey:process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint:process.env.IMAGEKIT_URL_ENDPOINT  
})

export default imageKit