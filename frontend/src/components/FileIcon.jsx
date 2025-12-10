import { FileText, File, Presentation, Table, Youtube } from 'lucide-react';

const FileIcon = ({ sourceType, size = 32 }) => {
  const iconProps = { size };

  switch (sourceType) {
    case 'pdf':
      return <FileText {...iconProps} color="#E74C3C" />;
    case 'docx':
      return <FileText {...iconProps} color="#2E86DE" />;
    case 'pptx':
      return <Presentation {...iconProps} color="#FFA726" />;
    case 'xlsx':
      return <Table {...iconProps} color="#26A69A" />;
    case 'txt':
      return <File {...iconProps} color="#78909C" />;
    case 'youtube':
      return <Youtube {...iconProps} color="#FF0000" />;
    default: 
      return <File {...iconProps} />;
  }
};

export default FileIcon;