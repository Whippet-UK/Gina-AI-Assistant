export interface SpecialisedRendererPasses {
  glass:{enabled:boolean;refraction:number;thickness:number;ior:number;chromaticAberration:number;fresnel:number;reflection:number;roughness:number;condensation:number;droplets:number};
  metal:{enabled:boolean;metallic:number;roughness:number;anisotropy:number;anisotropyRotation:number;environment:number;clearcoat:number;edgeWear:number};
  fluid:{enabled:boolean;level:number;meniscus:number;surfaceShine:number;bubbles:number;turbulence:number;wave:number;viscosity:number;foam:number};
  crt:{enabled:boolean;curvature:number;scanlines:number;phosphor:number;flicker:number;barrelDistortion:number;pixelSize:number;ghosting:number;vignette:number};
}
export const DEFAULT_SPECIALISED_RENDERER_PASSES:SpecialisedRendererPasses={
 glass:{enabled:true,refraction:.18,thickness:.04,ior:1.5,chromaticAberration:.015,fresnel:.7,reflection:.35,roughness:.08,condensation:0,droplets:0},
 metal:{enabled:true,metallic:.9,roughness:.3,anisotropy:.45,anisotropyRotation:0,environment:.35,clearcoat:.12,edgeWear:.05},
 fluid:{enabled:false,level:.5,meniscus:.08,surfaceShine:.3,bubbles:.05,turbulence:.08,wave:.04,viscosity:.5,foam:0},
 crt:{enabled:false,curvature:.12,scanlines:.3,phosphor:.7,flicker:.04,barrelDistortion:.08,pixelSize:2,ghosting:.08,vignette:.18}
};
