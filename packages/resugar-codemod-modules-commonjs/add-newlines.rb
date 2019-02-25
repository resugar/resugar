Dir['test/__fixtures__/*'].each do |file|
  content = File.read(file)
  unless content.end_with?("\n")
    File.write(file, content + "\n")
  end
end
