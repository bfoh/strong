import Foundation
import AVFoundation
import AppKit
let input = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
let data = try Data(contentsOf: URL(fileURLWithPath: input))
let rows = try JSONSerialization.jsonObject(with: data) as! [[String:Any]]
for row in rows where row["media_type"] as? String == "video" {
 let id=row["id"] as! String
 let asset=AVURLAsset(url: URL(fileURLWithPath:row["path"] as! String))
 let duration=CMTimeGetSeconds(asset.duration)
 let generator=AVAssetImageGenerator(asset:asset)
 generator.appliesPreferredTrackTransform=true
 generator.maximumSize=CGSize(width:900,height:900)
 var images=[String]()
 for (index,fraction) in [0.02,0.25,0.5,0.75].enumerated() {
  do {
   let cg=try generator.copyCGImage(at:CMTime(seconds:max(0,min(duration-0.1,duration*fraction)),preferredTimescale:600),actualTime:nil)
   let rep=NSBitmapImageRep(cgImage:cg)
   let file="\(output)/\(id)-\(index).jpg"
   try rep.representation(using:.jpeg,properties:[.compressionFactor:0.88])!.write(to:URL(fileURLWithPath:file))
   images.append(file)
  } catch { fputs("Frame failed \(id) \(index)\n",stderr) }
 }
 let tracks=asset.tracks(withMediaType:.video)
 let codecs=tracks.flatMap {$0.formatDescriptions}.map {String(describing:$0)}
 let result:[String:Any] = ["id":id,"duration":duration,"frames":images,"codec":codecs]
 print(String(data:try JSONSerialization.data(withJSONObject:result),encoding:.utf8)!)
}
